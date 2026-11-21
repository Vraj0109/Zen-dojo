class Solution:
    def rangeQueriesAndCopies(self, arr: list[int], queries: list[list[int]]) -> list[int]:
        arrays = [list(arr)]
        ans = []
        for q in queries:
            if q[0] == 1:
                k, a, x = q[1] - 1, q[2] - 1, q[3]
                arrays[k][a] = x
            elif q[0] == 2:
                k, a, b = q[1] - 1, q[2] - 1, q[3] - 1
                ans.append(sum(arrays[k][a:b + 1]))
            else:
                k = q[1] - 1
                arrays.append(list(arrays[k]))
        return ans
