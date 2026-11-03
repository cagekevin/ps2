using System;
using System.Collections.Generic;

namespace jsxbin_to_jsx.JsxbinDecoding
{
    public sealed class LogicalExp : AbstractNode
    {
        LogicalExpInfo info;

        public override string Marker
        {
            get { return Convert.ToChar(0x55).ToString(); }
        }

        public override NodeType NodeType
        {
            get
            {
                return NodeType.LogicalExp;
            }
        }

        public override void Decode()
        {
            info = DecodeLogicalExp();
        }

        public override string PrettyPrint()
        {
            /* 子表达式要按优先级补括号：`a && (b || c)` 原样输出会变成 `a && b || c`，语义全变 */
            string left = info.LeftExpr == null ? info.LeftLiteral : PrintOperand(info.LeftExpr);
            string right = info.RightExpr == null ? info.RightLiteral : PrintOperand(info.RightExpr);
            return string.Format("{0} {1} {2}", left, info.OpName, right);
        }
    }
}
