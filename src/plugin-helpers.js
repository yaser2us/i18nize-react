const babel = require("@babel/core");
const _ = require("lodash");

const { getUniqueKeyFromFreeText } = require("./lut");

// Dont extract value for Literals under this attribute
const isBlacklistedForJsxAttribute = (path) => {
  const blacklistedJsxAttributes = [
    // React router
    "path",
    "from",
    "to",
    "href",
    "as",
    // Inline style
    "style",
    "className",
    "color",
    "key",
    // Code
    "dangerouslySetInnerHTML",
    "src",
  ];
  const jsxAttributeParent = path.findParent((p) => p.isJSXAttribute());
  if (!jsxAttributeParent) return false;
  const name = _.get(jsxAttributeParent, "node.name.name");
  if (blacklistedJsxAttributes.includes(name)) return true;
  return false;
};

const handleConditionalExpressions = (path) => {
  // For ternary operators
  if (!path.findParent((p) => p.isConditionalExpression())) return;

  // Only extract the value of identifiers
  // who are children of some JSX element
  if (!path.findParent((p) => p.isJSXElement())) return;

  // Check for blacklist
  if (isBlacklistedForJsxAttribute(path)) return;

  const coreValue = _.get(path, "node.value", "").trim();
  if (!coreValue.length) return;
  const kValue = getUniqueKeyFromFreeText(coreValue);
  // TODO: OPTIMIZATION: Use quasi quotes to optimize this

  const srcString = `i18n.t(k.${kValue})`;
  if (babel.types.isJSXAttribute(path.parent)) {
    // TODO: The next line does not parse
    // path.replaceWithSourceString(`{${srcString}}`);
  } else {
    path.replaceWithSourceString(srcString);
  }
};

const isStyleSheetCreate = (path) => {
  const node = path.parentPath?.parentPath?.parentPath?.parentPath?.parentPath?.node?.init;
    return node && (
      node.callee?.type === "MemberExpression" &&
      node.callee?.object?.type === "Identifier" &&
      node.callee?.object?.name === "StyleSheet" &&
      node.callee?.property?.name === "create" &&
      node.arguments?.length === 1 &&
      node.arguments[0].type === "ObjectExpression"
    );
};

module.exports = {
  isBlacklistedForJsxAttribute,
  handleConditionalExpressions,
  isStyleSheetCreate,
};
