#include <string>

using namespace std;

class Solution {
    int decodeHelper(const string& s, int& i) {
        return 0;
    }
public:
    string decodeString(string s) {
        // Brute force: repeatedly find innermost ']' and matching '[' and replace
        while (true) {
            size_t closePos = s.find(']');
            if (closePos == string::npos) break;
            size_t openPos = s.rfind('[', closePos);
            // find number before openPos
            size_t numStart = openPos;
            while (numStart > 0 && isdigit(s[numStart - 1])) {
                numStart--;
            }
            int k = stoi(s.substr(numStart, openPos - numStart));
            string inner = s.substr(openPos + 1, closePos - openPos - 1);
            string rep;
            for (int i = 0; i < k; i++) rep += inner;
            s = s.substr(0, numStart) + rep + s.substr(closePos + 1);
        }
        return s;
    }
};
