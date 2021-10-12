import parser from '@babel/parser';

const parseExpression = parser.parseExpression;
parser.parseExpression = function(value, options) {
    if (value.includes('import.meta')) {
        options = options || {};
        options.sourceType = 'module';
    }
    return parseExpression.call(this, value, options);
};
