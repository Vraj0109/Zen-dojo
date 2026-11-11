class Solution {
    public int squareDigitChains(int limit) {
        int[] t = new int[10000];
        for (int i = 1; i < 10000; i++) t[i] = t[i / 10] + (i % 10) * (i % 10);
        boolean[] to89 = new boolean[800];
        for (int v = 1; v < 800; v++) {
            int x = v;
            while (x != 1 && x != 89) {
                int s = 0, m = x;
                while (m > 0) {
                    s += (m % 10) * (m % 10);
                    m /= 10;
                }
                x = s;
            }
            to89[v] = (x == 89);
        }
        int count = 0;
        for (int n = 1; n < limit; n++) {
            int s = t[n / 10000] + t[n % 10000];
            if (to89[s]) count++;
        }
        return count;
    }
}
