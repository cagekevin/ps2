using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace jsxbin_to_jsx.JsxbinDecoding
{
    public class ObjectExpr : AbstractNode
    {
        string objId;
        List<Tuple<string, INode>> props;

        public override string Marker
        {
            get { return Convert.ToChar(0x57).ToString(); }
        }

        public override NodeType NodeType
        {
            get
            {
                return NodeType.ObjectExpr;
            }
        }

        public override void Decode()
        {
            objId = DecodeId();
            props = new List<Tuple<string, INode>>();
            ForEachChild(() =>
            {
                var id = DecodeId();
                var val = DecodeNode();
                var t = Tuple.Create(id, val);
                props.Add(t);
            });
        }

        public override string PrettyPrint()
        {
            StringBuilder b = new StringBuilder();
            if (props.Count == 0)
            {
                b.Append("{}");
            }
            else
            {
                var propValuesCombined = props.Select(t => {
                    string objExpr = t.Item1;
                    if (!IsValidIdentifier(t.Item1))
                    {
                        /* 键里可能有引号/换行（json2 的 meta 表就是），不转义会当场断开字符串 */
                        objExpr = "\"" + EscapeString(objExpr) + "\"";
                    }
                    return objExpr + ": " + t.Item2.PrettyPrint();
                });
                string init = string.Join("," + Environment.NewLine, propValuesCombined);
                b.AppendLine("{");
                b.AppendLine(init);
                b.Append("}");
            }
            return b.ToString();
        }
    }
}
