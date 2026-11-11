# verify: skip-stress
class Solution:
    def calculate(self, s: str) -> int:
        total = 0
        last = 0
        cur = 0
        op = '+'
        for i in range(len(s) + 1):
            c = s[i] if i < len(s) else '+'
            if c.isdigit():
                cur = cur * 10 + int(c)
                continue
            if c == ' ':
                continue
            if op == '+':
                total += last
                last = cur
            elif op == '-':
                total += last
                last = -cur
            elif op == '*':
                last *= cur
            else:
                last = int(last / cur)
            op = c
            cur = 0
        return total + last