#include <string>

using namespace std;

class Solution {
    int evaluateHelper(const string& s, size_t& i) {
        long long res = 0, num = 0;
        int sign = 1;
        while (i < s.size()) {
            char c = s[i++];
            if (isdigit(c)) {
                num = num * 10 + (c - '0');
            } else if (c == '(') {
                num = evaluateHelper(s, i);
            } else if (c == ')') {
                res += sign * num;
                return (int)res;
            } else if (c == '+' || c == '-') {
                res += sign * num;
                num = 0;
                sign = (c == '+') ? 1 : -1;
            }
        }
        res += sign * num;
        return (int)res;
    }
public:
    int calculate(string s) {
        size_t i = 0;
        return evaluateHelper(s, i);
    }
};
