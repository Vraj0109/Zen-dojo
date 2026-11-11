class Solution:
    def removeInvalidParentheses(self, s: str) -> List[str]:
        res = []

        def dfs(idx, open_count, rem_l, rem_r, cur):
            if idx == len(s):
                if open_count == 0 and rem_l == 0 and rem_r == 0:
                    res.append(cur)
                return
            c = s[idx]
            # Option 1: remove parenthesis if needed
            if c == '(' and rem_l > 0:
                j = idx
                while j < len(s) and s[j] == '(':
                    j += 1
                count = j - idx
                for k in range(1, min(rem_l, count) + 1):
                    dfs(idx + k, open_count, rem_l - k, rem_r, cur)
            if c == ')' and rem_r > 0:
                j = idx
                while j < len(s) and s[j] == ')':
                    j += 1
                count = j - idx
                for k in range(1, min(rem_r, count) + 1):
                    dfs(idx + k, open_count, rem_l, rem_r - k, cur)
            # Option 2: keep character
            if c == '(':
                dfs(idx + 1, open_count + 1, rem_l, rem_r, cur + c)
            elif c == ')':
                if open_count > 0:
                    dfs(idx + 1, open_count - 1, rem_l, rem_r, cur + c)
            else:
                dfs(idx + 1, open_count, rem_l, rem_r, cur + c)

        rem_l = rem_r = 0
        for c in s:
            if c == '(':
                rem_l += 1
            elif c == ')':
                if rem_l > 0:
                    rem_l -= 1
                else:
                    rem_r += 1

        dfs(0, 0, rem_l, rem_r, "")
        result = sorted(set(res))
        return result if result else [""]
