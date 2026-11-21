#include <vector>

class Solution {
public:
    std::vector<int> corpFlightBookings(std::vector<std::vector<int>>& bookings, int n) {
        std::vector<int> ans(n, 0);
        for (const auto& b : bookings) {
            int first = b[0], last = b[1], seats = b[2];
            for (int i = first - 1; i < last; i++) {
                ans[i] += seats;
            }
        }
        return ans;
    }
};
