class Solution:
    def minimumBills(self, n: int) -> int:
        bills = 0
        for d in (100, 20, 10, 5, 1):
            bills += n // d
            n %= d
        return bills
