class Solution:
    def listRemovals(self, arr: list[int], positions: list[int]) -> list[int]:
        a = list(arr)
        ans = []
        for p in positions:
            ans.append(a.pop(p - 1))
        return ans
