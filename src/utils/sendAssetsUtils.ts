
type WizardStep = 'assetType' | 'assetDetails' | 'recipient' | 'summary';

export const getStepTitle = (step: WizardStep, assetType: 'ft' | 'nft'): string => {
  switch (step) {
    case 'assetType': return 'Choose Asset Type';
    case 'assetDetails': return `${assetType === 'ft' ? 'Token' : 'NFT'} Details`;
    case 'recipient': return 'Select Recipient';
    case 'summary': return 'Review & Send';
  }
};

export const getNextStep = (currentStep: WizardStep): WizardStep => {
  switch (currentStep) {
    case 'assetType': return 'assetDetails';
    case 'assetDetails': return 'recipient';
    case 'recipient': return 'summary';
    case 'summary': return 'summary'; // stays on summary
  }
};

export const getPreviousStep = (currentStep: WizardStep): WizardStep => {
  switch (currentStep) {
    case 'assetType': return 'assetType'; // stays on first step
    case 'assetDetails': return 'assetType';
    case 'recipient': return 'assetDetails';
    case 'summary': return 'recipient';
  }
};
