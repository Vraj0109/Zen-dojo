class Solution:
    def digitQueries(self, k_str: str) -> int:
        k = int(k_str)
        length = 1
        count = 9
        start = 1
        while k > length * count:
            k -= length * count
            length += 1
            count *= 10
            start *= 10
        start += (k - 1) // length
        s = str(start)
        return int(s[(k - 1) % length])
