from typing import List

class Solution:
    def movieFestival(self, movies: List[List[int]]) -> int:
        movies.sort(key=lambda m: (m[1], m[0]))
        count = 0
        last_end = 0
        for start, end in movies:
            if start >= last_end:
                count += 1
                last_end = end
        return count
