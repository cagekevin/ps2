using System;
using System.Collections.Generic;

namespace jsxbin_to_jsx.JsxbinDecoding
{
    public class BinaryExpr : AbstractNode
    {
        string opName;
        INode left;
        INode right;
        string literalLeft;
        string literalRight;

        public override string Marker
        {
            get { return Convert.ToChar(0x43).ToString(); }
        }

        public override NodeType NodeType
        {
            get
            {
                return NodeType.BinaryExpr;
            }
        }

        public string OpName { get; set; }
        public string Op { get; set; }

        public override void Decode()
        {
            opName = DecodeId();
            left = DecodeNode();
            right = DecodeNode();
            literalLeft = DecodeVariant();
            literalRight = DecodeVariant();
            var leftExpr = CreateExpr(literalLeft, left);
            var rightExpr = CreateExpr(literalRight, right);
            bool isUpdateExpr = (leftExpr != null && rightExpr == null) || (leftExpr == null && rightExpr != null);
            if (isUpdateExpr)
            {
                string op = leftExpr + rightExpr;
                OpName = opName;
                Op = op;
            }
            else
            {
                Op = string.Format("{0} {1} {2}", leftExpr, opName, rightExpr);
            }
        }

        public override string PrettyPrint()
        {
            return Op;
        }

        /* literal 优先（jsxbin 把常量直接挂在节点上），否则打印子节点并按优先级补括号。
           旧实现只给 BinaryExpr 子节点补括号，三元/逻辑/赋值子节点会丢括号算错。 */
        string CreateExpr(string literal, INode expr)
        {
            if (expr == null)
            {
                return literal;
            }
            return PrintOperand(expr);
        }
    }
}
