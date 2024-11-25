import vscode from "vscode";

export default async function generateTranslate(textEditor: vscode.TextEditor) {
  const models = await vscode.lm.selectChatModels({
    family: "o1-mini"
  });
  const model = models[0];
  if (!model) {
    vscode.window.showErrorMessage("No language model is available.");
    return;
  }

  let chatResponse: vscode.LanguageModelChatResponse | undefined;

  const selectedText = textEditor.document.getText(textEditor.selection);

  const messages = [
    vscode.LanguageModelChatMessage
      .User(`Think carefully and step by step like a translator would. 
Your task is to translate each field in the code below into Chinese and insert the translation as a js/ts documentation comment Spread out on every field.
Try to place the comment content on one line, e.g. /** xxx */. Be creative. IMPORTANT respond just with CODE. DO NOT use markdown!`),
    vscode.LanguageModelChatMessage.User(selectedText),
  ];

  try {
    chatResponse = await model.sendRequest(
      messages,
      {},
      new vscode.CancellationTokenSource().token
    );
  } catch (err) {
    if (err instanceof vscode.LanguageModelError) {
      console.log(err.message, err.code, err.cause);
    } else {
      throw err;
    }
    return;
  }

  // Clear the editor content before inserting new content
  await textEditor.edit((edit) => {
    const start = new vscode.Position(0, 0);
    const end = new vscode.Position(
      textEditor.document.lineCount - 1,
      textEditor.document.lineAt(textEditor.document.lineCount - 1).text.length
    );
    edit.delete(new vscode.Range(start, end));
  });

  try {
    // Stream the code into the editor as it is coming in from the Language Model
    for await (const fragment of chatResponse.text) {
      await textEditor.edit((edit) => {
        const lastLine = textEditor.document.lineAt(
          textEditor.document.lineCount - 1
        );
        const position = new vscode.Position(
          lastLine.lineNumber,
          lastLine.text.length
        );
        edit.insert(position, fragment);
      });
    }
  } catch (err) {
    // async response stream may fail, e.g network interruption or server side error
    await textEditor.edit((edit) => {
      const lastLine = textEditor.document.lineAt(
        textEditor.document.lineCount - 1
      );
      const position = new vscode.Position(
        lastLine.lineNumber,
        lastLine.text.length
      );
      edit.insert(position, (<Error>err).message);
    });
  }
}
