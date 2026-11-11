class Solution {
    public int yearsUntilBigger(int a, int b) {
        int years = 0;
        while (a <= b) {
            a *= 3;
            b *= 2;
            years++;
        }
        return years;
    }
}
