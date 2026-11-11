class Solution {
    public int movesToDivisible(int a, int b) {
        int rem = a % b;
        return rem == 0 ? 0 : b - rem;
    }
}
