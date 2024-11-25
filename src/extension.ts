import * as vscode from "vscode";
import generateTsType from "./generateTsType";
import generateTranslate from "./generateTranslate";

export function activate(context: vscode.ExtensionContext) {
  const convertToType = vscode.commands.registerTextEditorCommand(
    "y-utils.convertToType",
    generateTsType
  );

  const translate = vscode.commands.registerTextEditorCommand(
    "y-utils.translate",
    generateTranslate
  );

  context.subscriptions.push(convertToType, translate);
}

export function deactivate() {}
