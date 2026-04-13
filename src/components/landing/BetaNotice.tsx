
const BetaNotice = () => {
  return (
    <div className="bg-orange-600/20 border-b border-orange-600/30">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center text-center">
          <span className="bg-orange-600 text-orange-100 px-2 py-1 rounded text-xs font-semibold mr-2">BETA</span>
          <span className="text-orange-200 text-sm">
            Smart Wallet is currently in beta. Beware of scam apps claiming to be Smart Wallet in app stores.
          </span>
        </div>
      </div>
    </div>
  );
};

export default BetaNotice;
