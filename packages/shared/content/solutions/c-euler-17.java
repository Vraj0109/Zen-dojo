class Solution {
    private static final String[] ones = {"", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"};
    private static final String[] tens = {"", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"};

    private int below100(int x) {
        if (x < 20) return ones[x].length();
        return tens[x / 10].length() + ones[x % 10].length();
    }

    private int below1000(int x) {
        int h = x / 100, r = x % 100, res = 0;
        if (h > 0) res += ones[h].length() + 7;
        if (h > 0 && r > 0) res += 3;
        return res + below100(r);
    }

    private int one(int x) {
        int t = x / 1000, r = x % 1000, res = 0;
        if (t > 0) res += below100(t) + 8;
        if (r > 0) {
            if (t > 0 && r < 100) res += 3;
            res += below1000(r);
        }
        return res;
    }

    public int letterCount(int n) {
        int total = 0;
        for (int i = 1; i <= n; i++) total += one(i);
        return total;
    }
}
