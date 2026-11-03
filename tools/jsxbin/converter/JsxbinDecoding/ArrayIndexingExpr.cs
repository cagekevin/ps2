using System;

namespace jsxbin_to_jsx.JsxbinDecoding
{
    public class ArrayIndexingExpr : AbstractNode
    {
        INode arrayInfo;
        INode exprInfo;

        public override string Marker
        {
            get { return Convert.ToChar(0x51).ToString(); }
        }

        public override NodeType NodeType
        {
            get
            {
                return NodeType.ArrayIndexingExpr;
            }
        }

        public override void Decode()
        {
            var array = DecodeRefAndNode();
            exprInfo = DecodeNode();
            arrayInfo = array.Item2;
        }

        public override string PrettyPrint()
        {
            /* 下标基底的括号规则与 `.` 相同，旧实现把子节点提前转成字符串，丢掉了类型信息 */
            string array = arrayInfo == null ? "" : PrintBase(arrayInfo);
            return string.Format("{0}[{1}]", array, exprInfo.PrettyPrint());
        }
    }
}
