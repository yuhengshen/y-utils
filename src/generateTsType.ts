import { parse, Node } from "acorn";
import { simple } from "acorn-walk";
import vscode from "vscode";
import type {
  Expression,
  SpreadElement,
  ArrayExpression,
  ObjectExpression,
} from "acorn";

function getArrayType(node: ArrayExpression): string {
  const types = Array.from(
    new Set(node.elements.filter((e) => e !== null).map(getType))
  );

  if (types.length === 0) {
    return "any[]";
  }
  if (types.length === 1) {
    return `${types[0]}[]`;
  }

  return `(${types.join(" | ")})[]`;
}

function getObjectType(node: ObjectExpression): string {
  const entries = node.properties
    .map((prop: any) => {
      // const comment = `\n/** 占位 */\n`;
      let typeStr = "";
      const keyName = prop.key.name || prop.key.value;
      if (prop.value.raw === "null") {
        typeStr = `${keyName}?: any`;
      } else {
        typeStr = `${keyName}: ${getType(prop.value)}`;
      }

      // return `${comment}${typeStr}`;
      return typeStr;
    })
    .join(";\n");
  return `{ \n${entries}\n }`;
}

function getType(node: Expression | SpreadElement): string {
  if (node.type === "ArrayExpression") {
    return getArrayType(node);
  } else if (node.type === "ObjectExpression") {
    return getObjectType(node);
  } else {
    switch (node.type) {
      case "Literal":
        return typeof node.value;
      default:
        return "any";
    }
  }
}

function extractObjectNodes(ast: Node) {
  const objNodes: (ArrayExpression | ObjectExpression)[] = [];
  const objNames: string[] = [];

  simple(ast, {
    VariableDeclaration(node) {
      const declaration = node.declarations[0];
      if (declaration.id.type === "Identifier") {
        const objName = declaration.id.name;
        if (!objName) {
          return;
        }
        const objNode = declaration.init;
        if (
          objNode &&
          (objNode.type === "ArrayExpression" ||
            objNode.type === "ObjectExpression")
        ) {
          objNodes.push(objNode);
          objNames.push(objName);
        }
      }
    },
  });

  return { objNodes, objNames };
}

export default function generateTsType(textEditor: vscode.TextEditor) {
  const code = textEditor.document.getText(textEditor.selection);
  const ast = parse(code, { ecmaVersion: 2020 });
  const { objNodes, objNames } = extractObjectNodes(ast);

  if (!objNames.length) {
    throw new Error("Object not found in the provided code.");
  }

  const res = objNames.map((objName, index) => {
    const objNode = objNodes[index];
    const typeDefinition = getType(objNode);
    return `type ${
      objName.charAt(0).toUpperCase() + objName.slice(1)
    } = ${typeDefinition};`;
  });

  textEditor.edit((editBuilder) => {
    editBuilder.replace(textEditor.selection, res.join("\n\n"));
  });
}
