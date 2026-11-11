class Solution {
    public int taxi(int[] groups) {
        int[] c = new int[5];
        for (int g : groups) c[g]++;
        int taxis = c[4] + c[3];
        int ones = Math.max(0, c[1] - c[3]);
        taxis += c[2] / 2;
        if (c[2] % 2 != 0) {
            taxis++;
            ones = Math.max(0, ones - 2);
        }
        taxis += (ones + 3) / 4;
        return taxis;
    }
}
