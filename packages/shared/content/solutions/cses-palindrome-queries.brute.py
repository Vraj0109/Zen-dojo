class Solution:
    def palindromeQueries(self, s: str, queries: list[list[str]]) -> list[str]:
        chars = list(s)
        ans = []
        for q in queries:
            if q[0] == "1":
                k = int(q[1]) - 1
                c = q[2]
                chars[k] = c
            else:
                a = int(q[1]) - 1
                b = int(q[2]) - 1
                sub = chars[a:b + 1]
                if sub == sub[::-1]:
                    ans.append("YES")
                else:
                    ans.append("NO")
        return ans
