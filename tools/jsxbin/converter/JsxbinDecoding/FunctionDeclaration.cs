using System;
using System.Linq;
using System.Text;

namespace jsxbin_to_jsx.JsxbinDecoding
{
    public class FunctionDeclaration : AbstractNode, IStatement
    {
        LineInfo bodyInfo;
        FunctionSignature signature;
        int type;

        public int LineNumber
        {
            get
            {
                return bodyInfo.LineNumber;
            }
        }

        public override string Marker
        {
            get { return Convert.ToChar(0x4D).ToString(); }
        }

        public override NodeType NodeType
        {
            get
            {
                return NodeType.FunctionDeclaration;
            }
        }

        public override void Decode()
        {
            bodyInfo = DecodeLineInfo();
            signature = DecodeSignature();
            type = DecodeLength();
        }
        
        public override string PrettyPrint()
        {
            bool isHeader = signature.Header5 == 1;
            string body = bodyInfo.CreateBody();
            // 无初值的 `var a, b;` 只留在函数头的槽位里，语句体里没有任何痕迹。
            // 不在这里补回，这些名字就成了隐式全局：递归函数（json2 的 str）会被内层调用覆盖，直接串数据。
            var localVars = signature.Parameter.OrderBy(p => p.Item2).Where(p => !IsRealParameter(p.Item2)).Select(p => p.Item1).ToList();
            if (localVars.Count > 0)
            {
                body = "var " + string.Join(", ", localVars) + ";" + Environment.NewLine + body;
            }
            // Header seems to imply an automatically added "wrapper" function which is not really needed.
            if (isHeader)
            {
                return body;
            }
            // 参数表里混着局部变量，靠这个数值区间区分：区间内是真正的形参
            var paramList = signature.Parameter.OrderBy(p => p.Item2).Where(p => IsRealParameter(p.Item2)).Select(p => p.Item1).ToList();
            var paramNames = string.Join(", ", paramList);
            StringBuilder b = new StringBuilder();
            b.AppendLine(string.Format("function {0}({1}) {{", signature.Name, paramNames));
            b.AppendLine(body);
            b.Append("}");
            return b.ToString();
        }

        static bool IsRealParameter(int marker)
        {
            return marker > 536870000 && marker < 540000000;
        }
    }
}
