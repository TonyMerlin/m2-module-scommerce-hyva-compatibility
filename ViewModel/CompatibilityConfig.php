<?php

declare(strict_types=1);

namespace Merlin\ScommerceHyvaCompatibility\ViewModel;

use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Module\Manager as ModuleManager;
use Magento\Framework\View\Element\Block\ArgumentInterface;
use Magento\Store\Model\ScopeInterface;

class CompatibilityConfig implements ArgumentInterface
{
    private const AMASTY_CONSENT_PATH = 'amasty_gdprcookie/consent_mode/enable';

    public function __construct(
        private readonly ModuleManager $moduleManager,
        private readonly ScopeConfigInterface $scopeConfig
    ) {
    }

    public function isAmastyGoogleConsentModeActive(): bool
    {
        return $this->moduleManager->isEnabled('Amasty_GoogleConsentMode')
            && $this->moduleManager->isEnabled('Amasty_GoogleConsentModeHyva')
            && $this->scopeConfig->isSetFlag(self::AMASTY_CONSENT_PATH, ScopeInterface::SCOPE_STORE);
    }
}
