from typing import List

class Solution:
    def youngPhysicist(self, forces: List[List[int]]) -> bool:
        x = sum(f[0] for f in forces)
        y = sum(f[1] for f in forces)
        z = sum(f[2] for f in forces)
        return x == 0 and y == 0 and z == 0
