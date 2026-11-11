from typing import List

class Solution:
    def countAvailableRooms(self, rooms: List[List[int]]) -> int:
        return sum(1 for r in rooms if r[1] - r[0] >= 2)
