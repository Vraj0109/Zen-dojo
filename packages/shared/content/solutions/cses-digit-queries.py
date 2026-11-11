class Solution:
    def digitQueries(self, k: str) -> int:
        kv = int(k)
        length = 1
        count = 9
        start = 1
        while kv > length * count:
            kv -= length * count
            length += 1
            count *= 10
            start *= 10
        num = start + (kv - 1) // length
        s = str(num)
        return int(s[(kv - 1) % length])
