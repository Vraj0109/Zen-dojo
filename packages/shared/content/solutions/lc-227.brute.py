class Solution:
    def calculate(self, s: str) -> int:
        vals = []
        ops = []
        cur = 0
        has_num = False
        for c in s:
            if c.isdigit():
                cur = cur * 10 + int(c)
                has_num = True
            elif c in "+-*/":
                vals.append(cur)
                cur = 0
                has_num = False
                ops.append(c)
        if has_num:
            vals.append(cur)

        # Pass 1: * and /
        next_vals = [vals[0]]
        next_ops = []
        for i, op in enumerate(ops):
            nxt = vals[i + 1]
            if op == "*":
                next_vals[-1] *= nxt
            elif op == "/":
                next_vals[-1] = int(next_vals[-1] / nxt)
            else:
                next_ops.append(op)
                next_vals.append(nxt)

        # Pass 2: + and -
        res = next_vals[0]
        for i, op in enumerate(next_ops):
            nxt = next_vals[i + 1]
            if op == "+":
                res += nxt
            else:
                res -= nxt
        return res
