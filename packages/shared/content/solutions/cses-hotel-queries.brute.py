class Solution:
    def hotelQueries(self, rooms: list[int], groups: list[int]) -> list[int]:
        r = list(rooms)
        n = len(r)
        ans = []
        for need in groups:
            found = 0
            for i in range(n):
                if r[i] >= need:
                    found = i + 1
                    r[i] -= need
                    break
            ans.append(found)
        return ans
