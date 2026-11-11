class Solution {
    public boolean hasOddDivisor(long n) {
        return (n & (n - 1)) != 0;
    }
}
