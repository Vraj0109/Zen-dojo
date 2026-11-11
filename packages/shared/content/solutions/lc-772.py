class Solution:
    def calculate(self, s: str) -> int:
        i = 0

        def parse() -> int:
            nonlocal i
            nums = []
            op = '+'
            cur = 0
            while i < len(s):
                c = s[i]
                i += 1
                if c.isdigit():
                    cur = cur * 10 + int(c)
                elif c == '(':
                    cur = parse()
                if (not c.isdigit() and c != ' ') or i == len(s):
                    if op == '+':
                        nums.append(cur)
                    elif op == '-':
                        nums.append(-cur)
                    elif op == '*':
                        nums.append(nums.pop() * cur)
                    elif op == '/':
                        top = nums.pop()
                        nums.append(int(top / cur))
                    op = c
                    cur = 0
                if c == ')':
                    break
            return sum(nums)

        return parse()
