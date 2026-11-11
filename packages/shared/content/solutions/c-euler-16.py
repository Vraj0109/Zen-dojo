import sys
sys.set_int_max_str_digits(100000)

class Solution:
    def powerDigitSum(self, exponent: int) -> int:
        return sum(int(d) for d in str(2 ** exponent))
