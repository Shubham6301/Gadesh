import { useTheme } from "../contexts/ThemeContext";
export default function MarqueeLogos() {
    const { isDark } = useTheme();
  const logos = [
    "https://www.google.com/s2/favicons?domain=google.com&sz=128",
    "https://www.google.com/s2/favicons?domain=amazon.com&sz=128",
    "https://www.google.com/s2/favicons?domain=meta.com&sz=128",
    "https://www.google.com/s2/favicons?domain=apple.com&sz=128",
    "https://www.google.com/s2/favicons?domain=netflix.com&sz=128",
    "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128",
    "https://www.google.com/s2/favicons?domain=adobe.com&sz=128",
    "https://www.google.com/s2/favicons?domain=paytm.com&sz=128",
    "https://www.google.com/s2/favicons?domain=phonepe.com&sz=128",
    "https://www.google.com/s2/favicons?domain=flipkart.com&sz=128",
    "https://www.google.com/s2/favicons?domain=uber.com&sz=128",
    "https://www.google.com/s2/favicons?domain=swiggy.com&sz=128",
    "https://www.google.com/s2/favicons?domain=zomato.com&sz=128",
    "https://www.google.com/s2/favicons?domain=infosys.com&sz=128",
    "https://www.google.com/s2/favicons?domain=tcs.com&sz=128",
    "https://www.google.com/s2/favicons?domain=wipro.com&sz=128",
    "https://www.google.com/s2/favicons?domain=salesforce.com&sz=128",
    "https://www.google.com/s2/favicons?domain=oracle.com&sz=128",
    "https://www.google.com/s2/favicons?domain=ibm.com&sz=128",
    "https://www.google.com/s2/favicons?domain=intel.com&sz=128",
    "https://www.google.com/s2/favicons?domain=nvidia.com&sz=128",
    "https://www.google.com/s2/favicons?domain=tesla.com&sz=128",
    "https://www.google.com/s2/favicons?domain=twitter.com&sz=128",
    "https://www.google.com/s2/favicons?domain=linkedin.com&sz=128",
    "https://www.google.com/s2/favicons?domain=spotify.com&sz=128",
    "https://www.google.com/s2/favicons?domain=airbnb.com&sz=128",
    "https://www.google.com/s2/favicons?domain=stripe.com&sz=128",
    "https://www.google.com/s2/favicons?domain=razorpay.com&sz=128",
    "https://www.google.com/s2/favicons?domain=freshworks.com&sz=128",
    "https://www.google.com/s2/favicons?domain=zoho.com&sz=128",
    "https://www.google.com/s2/favicons?domain=byju.com&sz=128",
    "https://www.google.com/s2/favicons?domain=ola.com&sz=128",
    "https://www.google.com/s2/favicons?domain=meesho.com&sz=128",
    "https://www.google.com/s2/favicons?domain=naukri.com&sz=128",
    "https://www.google.com/s2/favicons?domain=atlassian.com&sz=128",
    "https://www.google.com/s2/favicons?domain=google.com&sz=128",
    "https://www.google.com/s2/favicons?domain=amazon.com&sz=128",
    "https://www.google.com/s2/favicons?domain=meta.com&sz=128",
    "https://www.google.com/s2/favicons?domain=apple.com&sz=128",
    "https://www.google.com/s2/favicons?domain=netflix.com&sz=128",
    "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128",
    "https://www.google.com/s2/favicons?domain=adobe.com&sz=128",
    "https://www.google.com/s2/favicons?domain=paytm.com&sz=128",
    "https://www.google.com/s2/favicons?domain=phonepe.com&sz=128",
    "https://www.google.com/s2/favicons?domain=flipkart.com&sz=128",
    "https://www.google.com/s2/favicons?domain=uber.com&sz=128",
    "https://www.google.com/s2/favicons?domain=swiggy.com&sz=128",
    "https://www.google.com/s2/favicons?domain=zomato.com&sz=128",
    "https://www.google.com/s2/favicons?domain=infosys.com&sz=128",
    "https://www.google.com/s2/favicons?domain=tcs.com&sz=128",
    "https://www.google.com/s2/favicons?domain=wipro.com&sz=128",
    "https://www.google.com/s2/favicons?domain=salesforce.com&sz=128",
    "https://www.google.com/s2/favicons?domain=oracle.com&sz=128",
    "https://www.google.com/s2/favicons?domain=ibm.com&sz=128",
    "https://www.google.com/s2/favicons?domain=intel.com&sz=128",
    "https://www.google.com/s2/favicons?domain=nvidia.com&sz=128",
    "https://www.google.com/s2/favicons?domain=tesla.com&sz=128",
    "https://www.google.com/s2/favicons?domain=twitter.com&sz=128",
    "https://www.google.com/s2/favicons?domain=linkedin.com&sz=128",
    "https://www.google.com/s2/favicons?domain=spotify.com&sz=128",
    "https://www.google.com/s2/favicons?domain=airbnb.com&sz=128",
    "https://www.google.com/s2/favicons?domain=stripe.com&sz=128",
    "https://www.google.com/s2/favicons?domain=razorpay.com&sz=128",
    "https://www.google.com/s2/favicons?domain=freshworks.com&sz=128",
    "https://www.google.com/s2/favicons?domain=zoho.com&sz=128",
    "https://www.google.com/s2/favicons?domain=byju.com&sz=128",
    "https://www.google.com/s2/favicons?domain=ola.com&sz=128",
    "https://www.google.com/s2/favicons?domain=meesho.com&sz=128",
    "https://www.google.com/s2/favicons?domain=naukri.com&sz=128",
    "https://www.google.com/s2/favicons?domain=atlassian.com&sz=128",
  ];
//   export default function MarqueeLogos() {
  return (
    <div className="mt-10 text-center pb-12" id="about">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 6s linear infinite;
        }
      `}</style>
      {/* Section Title */}
      <h2 className={`text-3xl font-bold mb-4 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
        🌐 Where Our Talent Gets Hired
      </h2>
      {/* Marquee */}
      <div
        className={`overflow-hidden whitespace-nowrap py-4 rounded-lg shadow-lg ${
          isDark
            ? "bg-gray-900"
            : "bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-gray-200"
        }`}
      >
        <div className="flex space-x-10 animate-marquee">
          {[...logos, ...logos].map((logo, index) => (
            <img key={index} src={logo} alt="Company Logo" className="h-12" />
          ))}
        </div>
      </div>
    </div>
  );
}
