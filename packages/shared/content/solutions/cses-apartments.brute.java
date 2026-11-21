import java.util.Arrays;

class Solution {
    public int apartments(int[] applicants, int[] apartments, int k) {
        Arrays.sort(applicants);
        Arrays.sort(apartments);
        int i = 0, j = 0, count = 0;
        while (i < applicants.length && j < apartments.length) {
            if (Math.abs(applicants[i] - apartments[j]) <= k) {
                count++;
                i++;
                j++;
            } else if (applicants[i] < apartments[j]) {
                i++;
            } else {
                j++;
            }
        }
        return count;
    }
}
