class Solution:
    def letterCount(self, n: int) -> int:
        ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
        tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]

        def below100(x: int) -> int:
            if x < 20:
                return len(ones[x])
            return len(tens[x // 10]) + len(ones[x % 10])

        def below1000(x: int) -> int:
            h = x // 100
            r = x % 100
            res = 0
            if h:
                res += len(ones[h]) + 7
            if h and r:
                res += 3
            return res + below100(r)

        def one(x: int) -> int:
            t = x // 1000
            r = x % 1000
            res = 0
            if t:
                res += below100(t) + 8
            if r:
                if t and r < 100:
                    res += 3
                res += below1000(r)
            return res

        total = 0
        for i in range(1, n + 1):
            total += one(i)
        return total
