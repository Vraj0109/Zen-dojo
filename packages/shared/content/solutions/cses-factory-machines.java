class Solution {
    public long factoryMachines(int[] machines, int t) {
        long lo = 1;
        int minVal = machines[0];
        for (int m : machines) minVal = Math.min(minVal, m);
        long hi = (long) minVal * t;
        long ans = hi;
        while (lo <= hi) {
            long mid = lo + (hi - lo) / 2;
            long products = 0;
            for (int m : machines) {
                products += mid / m;
                if (products >= t) break;
            }
            if (products >= t) {
                ans = mid;
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        }
        return ans;
    }
}
