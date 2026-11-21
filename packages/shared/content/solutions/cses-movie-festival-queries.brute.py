class Solution:
    def movieFestivalQueries(self, movies: list[list[int]], queries: list[list[int]]) -> list[int]:
        mv = sorted([(m[1], m[0]) for m in movies])
        ans = []
        for a, b in queries:
            count = 0
            last_end = a
            for end, start in mv:
                if start >= last_end and end <= b:
                    count += 1
                    last_end = end
            ans.append(count)
        return ans
