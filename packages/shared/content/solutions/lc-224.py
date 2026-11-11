# verify: skip-stress
class Solution:
    def calculate(self, s: str) -> int:
        res = 0
        num = 0
        sign = 1
        st = []
        for c in s:
            if c.isdigit():
                num = num * 10 + int(c)
            elif c in '+-':
                res += sign * num
                num = 0
                sign = 1 if c == '+' else -1
            elif c == '(':
                st.append(res)
                st.append(sign)
                res = 0
                sign = 1
            elif c == ')':
                res += sign * num
                num = 0
                s2 = st.pop()
                prev = st.pop()
                res = prev + s2 * res
                sign = 1
        res += sign * num
        return res