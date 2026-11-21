class Solution:
    def calculate(self, s: str) -> int:
        def eval_simple(expr: str) -> int:
            nums = []
            cur = 0
            sign = '+'
            for i, c in enumerate(expr):
                if c.isdigit():
                    cur = cur * 10 + int(c)
                if (not c.isdigit() and c != ' ') or i + 1 == len(expr):
                    if sign == '+':
                        nums.append(cur)
                    elif sign == '-':
                        nums.append(-cur)
                    elif sign == '*':
                        nums.append(nums.pop() * cur)
                    elif sign == '/':
                        nums.append(int(nums.pop() / cur))
                    sign = c
                    cur = 0
            return sum(nums)

        while ')' in s:
            r = s.find(')')
            l = s.rfind('(', 0, r)
            inner = s[l + 1:r]
            val = eval_simple(inner)
            s = s[:l] + str(val) + s[r + 1:]

        return eval_simple(s)
