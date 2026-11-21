class Solution:
    def salaryQueries(self, salaries: list[int], queries: list[list[int]]) -> list[int]:
        cur = list(salaries)
        ans = []
        for q in queries:
            if q[0] == 1:
                k, x = q[1] - 1, q[2]
                cur[k] = x
            else:
                a, b = q[1], q[2]
                ans.append(sum(1 for s in cur if a <= s <= b))
        return ans
