import type { DesignSpec, ProblemSpec, Ty } from "@habit/shared";

// "Design a class" problems. A test case is one line: [ops, args], for example
// [["LRUCache","put","get"],[[2],[1,1],[1]]]. The program makes the object from the first operation, calls the other
// operations in order, and answers with a list of results: null for the constructor and for methods that return nothing.
// The three functions here build the part of the harness that does this, for C++, Java and JavaScript.

export const CPP_TY: Record<Ty, string> = {
  list: "ListNode*",
  tree: "TreeNode*",
  int: "int",
  long: "long long",
  double: "double",
  bool: "bool",
  string: "std::string",
  "int[]": "std::vector<int>",
  "long[]": "std::vector<long long>",
  "bool[]": "std::vector<bool>",
  "string[]": "std::vector<std::string>",
  "int[][]": "std::vector<std::vector<int>>",
  "string[][]": "std::vector<std::vector<std::string>>",
};

const design = (spec: ProblemSpec): DesignSpec => {
  if (!spec.design) throw new Error("not a design problem");
  return spec.design;
};

/** C++: the body of one case. It leaves `o` (the answer as JSON) and `micros` (time spent in your methods) for the caller. */
export function cppDesignCase(spec: ProblemSpec): string {
  const d = design(spec);
  const reads = (ps: { name: string; type: Ty }[]) => ps.map((p, k) => `${k > 0 ? "r.expect(','); " : ""}${CPP_TY[p.type]} A${k}; habitRead(r, A${k});`).join(" ");
  const args = (ps: unknown[]) => ps.map((_, k) => `A${k}`).join(", ");
  const methods = d.methods
    .map((m) => {
      const call = `obj->${m.name}(${args(m.params)})`;
      return `                else if (ops[k] == "${m.name}") {
                    ${reads(m.params)}
                    auto t0 = std::chrono::steady_clock::now();
                    ${m.returns === "void" ? `${call}; o << "null";` : `auto res = ${call}; habitWrite(o, res);`}
                    micros += std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() - t0).count();
                }`;
    })
    .join("\n");
  return `r.expect('[');
            std::vector<std::string> ops; habitRead(r, ops);
            r.expect(','); r.expect('[');
            std::unique_ptr<${d.className}> obj;
            std::ostringstream o; o << '[';
            long long micros = 0;
            for (size_t k = 0; k < ops.size(); k++) {
                if (k) { r.expect(','); o << ','; }
                r.expect('[');
                try {
                    if (k > 0 && !obj) throw std::runtime_error("the object was not created");
                    if (ops[k] == "${d.className}") {
                        ${reads(d.ctor)}
                        auto t0 = std::chrono::steady_clock::now();
                        obj.reset(new ${d.className}(${args(d.ctor)}));
                        micros += std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() - t0).count();
                        o << "null";
                    }
${methods}
                    else throw std::runtime_error("there is no operation called " + ops[k]);
                } catch (std::exception& e) {
                    throw std::runtime_error("operation " + std::to_string(k + 1) + " (" + ops[k] + "): " + e.what());
                }
                r.expect(']');
            }
            o << ']';`;
}

const JAVA_CONV = (t: Ty, expr: string) =>
  ({ list: `list(${expr})`, tree: `tree(${expr})`, int: `toInt(${expr})`, long: `toLong(${expr})`, double: `toDouble(${expr})`, bool: `(Boolean) ${expr}`, string: `(String) ${expr}`, "int[]": `ints(${expr})`, "long[]": `longs(${expr})`, "bool[]": `bools(${expr})`, "string[]": `strings(${expr})`, "int[][]": `ints2(${expr})`, "string[][]": `strings2(${expr})` })[t];

/** Java: the body of one case inside main's try block. It defines `b` (the answer as JSON) and `us` (microseconds in your methods). */
export function javaDesignCase(spec: ProblemSpec): string {
  const d = design(spec);
  const args = (ps: { type: Ty }[]) => ps.map((p, k) => JAVA_CONV(p.type, `a.get(${k})`)).join(", ");
  const methods = d.methods
    .map((m) =>
      m.returns === "void"
        ? `else if (op.equals("${m.name}")) { obj.${m.name}(${args(m.params)}); b.append("null"); }`
        : `else if (op.equals("${m.name}")) { wr(b, obj.${m.name}(${args(m.params)})); }`,
    )
    .join("\n                    ");
  return `List<?> top = (List<?>) val();
                List<?> ops = (List<?>) top.get(0);
                List<?> argl = (List<?>) top.get(1);
                ${d.className} obj = null;
                StringBuilder b = new StringBuilder("[");
                long us = 0;
                for (int k = 0; k < ops.size(); k++) {
                    if (k > 0) b.append(',');
                    String op = (String) ops.get(k);
                    List<?> a = (List<?>) argl.get(k);
                    long t0 = System.nanoTime();
                    try {
                        if (op.equals("${d.className}")) { obj = new ${d.className}(${args(d.ctor)}); b.append("null"); }
                        ${methods}
                        else throw new RuntimeException("there is no operation called " + op);
                    } catch (Throwable e) {
                        throw new RuntimeException("operation " + (k + 1) + " (" + op + "): " + e);
                    }
                    us += (System.nanoTime() - t0) / 1000;
                }
                b.append(']');`;
}

/** JavaScript: the body of one case. It defines `shown` (the list of results) and `us` (microseconds in your methods). */
export function jsDesignCase(spec: ProblemSpec): string {
  const d = design(spec);
  const names = JSON.stringify(d.methods.map((m) => m.name));
  const voids = JSON.stringify(d.methods.filter((m) => m.returns === "void").map((m) => m.name));
  return `const ops = args[0], list = args[1];
        const methods = ${names}, voids = ${voids};
        let obj = null, us = 0;
        const shown = [];
        for (let k = 0; k < ops.length; k++) {
            const op = ops[k];
            try {
                const t0 = process.hrtime.bigint();
                if (op === "${d.className}") { obj = new ${d.className}(...list[k]); shown.push(null); }
                else if (methods.includes(op)) {
                    const res = obj[op](...list[k]);
                    shown.push(voids.includes(op) || res === undefined ? null : res);
                } else throw new Error("there is no operation called " + op);
                us += Number((process.hrtime.bigint() - t0) / 1000n);
            } catch (e) {
                throw new Error("operation " + (k + 1) + " (" + op + "): " + ((e && e.message) || e));
            }
        }`;
}
