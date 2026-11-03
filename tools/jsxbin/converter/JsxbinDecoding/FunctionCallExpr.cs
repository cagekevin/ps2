using System;
using System.Collections.Generic;
using System.Linq;

namespace jsxbin_to_jsx.JsxbinDecoding
{
    public class FunctionCallExpr : AbstractNode
    {
        INode functionName;
        INode argsInfo;
        bool isConstructorCall;

        public override string Marker
        {
            get { return Convert.ToChar(0x45).ToString(); }
        }

        public override NodeType NodeType
        {
            get
            {
                return NodeType.FunctionCallExpr;
            }
        }

        public override void Decode()
        {
            functionName = DecodeNode();
            argsInfo = DecodeNode();
            isConstructorCall = DecodeBool();
        }

        public override string PrettyPrint()
        {
            ArgumentList args = (ArgumentList)argsInfo;
            string ctor = isConstructorCall ? "new " : "";
            /* 被调用者按基底规则补括号：`(function () {...})()` 不能输出成 `function () {...}()`（那是语法错误） */
            string callExpr = string.Format("{0}{1}({2})", ctor, PrintBase(functionName), args == null ? "" : string.Join(", ", args.Arguments.Select(a => a.PrettyPrint())));
            return callExpr;
        }
    }
}
