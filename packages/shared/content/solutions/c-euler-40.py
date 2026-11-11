class Solution:
    def countingDigit(self, k: int) -> int:
        length = 1
        count = 9
        first = 1
        while k > length * count:
            k -= length * count
            length += 1
            count *= 10
            first *= 10
        num = first + (k - 1) // length
        s = str(num)
        return int(s[(k - 1) % length])
