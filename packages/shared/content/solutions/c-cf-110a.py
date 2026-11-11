class Solution:
    def nearlyLucky(self, n: str) -> bool:
        c = n.count('4') + n.count('7')
        if c == 0:
            return False
        return all(d in '47' for d in str(c))
