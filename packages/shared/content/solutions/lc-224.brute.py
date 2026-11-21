class Solution:
    def calculate(self, s: str) -> int:
        i = 0
        n = len(s)

        def helper() -> int:
            nonlocal i
            res = 0
            num = 0
            sign = 1
            while i < n:
                c = s[i]
                i += 1
                if c.isdigit():
                    num = num * 10 + int(c)
                elif c == '(':
                    num = helper()
                elif c == ')':
                    res += sign * num
                    return res
                elif c in "+-":
                    res += sign * num
                    num = 0
                    sign = 1 if c == '+' else -1
            res += sign * num
            return res

        return helper()
