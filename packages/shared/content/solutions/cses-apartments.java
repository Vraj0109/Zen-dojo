import java.util.*;

class Solution {
    public int apartments(int[] applicants, int[] apartments, int k) {
        Arrays.sort(applicants);
        Arrays.sort(apartments);
        int i = 0, j = 0, matched = 0;
        while (i < applicants.length && j < apartments.length) {
            if (apartments[j] < applicants[i] - k) {
                j++;
            } else if (apartments[j] > applicants[i] + k) {
                i++;
            } else {
                matched++;
                i++;
                j++;
            }
        }
        return matched;
    }
}
