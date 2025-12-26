module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
  plugins: [
    ['@babel/plugin-transform-modules-commonjs', { loose: true }],
    function() {
      return {
        visitor: {
          MemberExpression(path) {
            if (
              path.node.object &&
              path.node.object.type === 'MetaProperty' &&
              path.node.object.meta &&
              path.node.object.meta.name === 'meta' &&
              path.node.property &&
              path.node.property.name === 'env'
            ) {
              path.replaceWithSourceString('({ env: {} })');
            }
          },
        },
      };
    },
  ],
};

