import React, { useState } from 'react';
import { X, Ruler, Sparkles, Info, Check } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface SizeGuideModalProps {
  initialTab?: 'collection4' | 'newGuide';
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({ initialTab = 'collection4' }) => {
  const { isSizeGuideOpen, setIsSizeGuideOpen } = useStore();
  const [activeTab, setActiveTab] = useState<'collection4' | 'newGuide'>(initialTab);

  if (!isSizeGuideOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/70 backdrop-blur-md overflow-y-auto">
      <div 
        className="bg-[#FCFCFA] border border-[#EAEAEA] rounded-xs shadow-2xl w-full max-w-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsSizeGuideOpen(false)}
          className="absolute top-4 right-4 p-2 text-[#121212] hover:text-[#8C7853] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-5 h-5 text-[#8C7853]" />
          <span className="text-xs uppercase tracking-[0.25em] text-[#8C7853] font-medium">
            LaClassé Haute Couture Atelier Sizing
          </span>
        </div>

        <h3 className="font-serif text-2xl md:text-3xl font-medium text-[#121212] mb-3">
          Atelier Size Guide & Measurements
        </h3>

        {/* Tab switch between 4 COLLECTION Size Chart (LC001-LC004) and New Size Guide (LC005-LC009) */}
        <div className="flex border-b border-[#EAEAEA] mb-6 gap-2">
          <button
            onClick={() => setActiveTab('collection4')}
            className={`pb-2.5 px-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === 'collection4'
                ? 'border-[#121212] text-[#121212]'
                : 'border-transparent text-[#888888] hover:text-[#121212]'
            }`}
          >
            4 COLLECTION Chart (LC001–LC004)
          </button>
          <button
            onClick={() => setActiveTab('newGuide')}
            className={`pb-2.5 px-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer border-b-2 ${
              activeTab === 'newGuide'
                ? 'border-[#121212] text-[#121212]'
                : 'border-transparent text-[#888888] hover:text-[#121212]'
            }`}
          >
            New Size Guide (LC005–LC009)
          </button>
        </div>

        {/* TAB 1: 4 COLLECTION SIZE CHART (LC001-LC004) */}
        {activeTab === 'collection4' && (
          <div className="space-y-6">
            <p className="text-xs text-[#555555] leading-relaxed">
              Official measurement specifications for <strong>LC001</strong> (XXL), <strong>LC002</strong>, <strong>LC003</strong>, and <strong>LC004</strong> (L, XL, XXL).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-[#EAEAEA]">
                <thead>
                  <tr className="bg-[#121212] text-[#FCFCFA] uppercase tracking-wider text-[11px]">
                    <th className="p-3 border border-[#2D2D2D]">Measurement</th>
                    <th className="p-3 border border-[#2D2D2D]">L</th>
                    <th className="p-3 border border-[#2D2D2D]">XL</th>
                    <th className="p-3 border border-[#2D2D2D]">XXL (2XL)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA] text-[#333333]">
                  <tr className="hover:bg-[#F5F2EA]">
                    <td className="p-3 font-semibold">Chest (in)</td>
                    <td className="p-3">42–44</td>
                    <td className="p-3">45–47</td>
                    <td className="p-3">48–50</td>
                  </tr>
                  <tr className="hover:bg-[#F5F2EA]">
                    <td className="p-3 font-semibold">Hip (in)</td>
                    <td className="p-3">44–46</td>
                    <td className="p-3">48–50</td>
                    <td className="p-3">52–54</td>
                  </tr>
                  <tr className="hover:bg-[#F5F2EA]">
                    <td className="p-3 font-semibold">Abaya Length (in)</td>
                    <td className="p-3">56</td>
                    <td className="p-3">56</td>
                    <td className="p-3">56</td>
                  </tr>
                  <tr className="hover:bg-[#F5F2EA]">
                    <td className="p-3 font-semibold">Your Height (cm)</td>
                    <td className="p-3">159</td>
                    <td className="p-3">159</td>
                    <td className="p-3">159</td>
                  </tr>
                  <tr className="hover:bg-[#F5F2EA]">
                    <td className="p-3 font-semibold">Sleeve Length from Neck (in)</td>
                    <td className="p-3">28</td>
                    <td className="p-3">28</td>
                    <td className="p-3">28</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#E0DCD3] rounded-xs text-xs text-[#555555] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#8C7853] shrink-0 mt-0.5" />
              <span>
                <strong>Inventory Note:</strong> LC001 is exclusively available in XXL (56"). LC002, LC003, and LC004 are crafted in L, XL, and XXL (all 56"). Select <strong>Custom</strong> for bespoke made-to-measure tailoring.
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: NEW SIZE GUIDE (LC005-LC009) */}
        {activeTab === 'newGuide' && (
          <div className="space-y-6">
            <p className="text-xs text-[#555555] leading-relaxed">
              Standard size guide for <strong>LC005 through LC009</strong>. Crafted in an all-encompassing <strong>Free Size</strong> designed to drape elegantly across diverse body frames, paired with 5 calibrated lengths.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-[#EAEAEA]">
                <thead>
                  <tr className="bg-[#121212] text-[#FCFCFA] uppercase tracking-wider text-[11px]">
                    <th className="p-3 border border-[#2D2D2D]">Garment Size</th>
                    <th className="p-3 border border-[#2D2D2D]">Available Length Options</th>
                    <th className="p-3 border border-[#2D2D2D]">Recommended Customer Height</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAEAEA] text-[#333333]">
                  <tr className="hover:bg-[#F5F2EA]">
                    <td className="p-3 font-semibold" rowSpan={5}>Free Size (Relaxed Drape)</td>
                    <td className="p-3 font-semibold text-[#8C7853]">52 Inches</td>
                    <td className="p-3">5'0" – 5'2" (152 – 157 cm)</td>
                  </tr>
                  <tr className="hover:bg-[#F5F2EA]">
                    <td className="p-3 font-semibold text-[#8C7853]">54 Inches</td>
                    <td className="p-3">5'3" – 5'4" (158 – 162 cm)</td>
                  </tr>
                  <tr className="hover:bg-[#F5F2EA]">
                    <td className="p-3 font-semibold text-[#8C7853]">56 Inches</td>
                    <td className="p-3">5'5" – 5'6" (163 – 167 cm)</td>
                  </tr>
                  <tr className="hover:bg-[#F5F2EA]">
                    <td className="p-3 font-semibold text-[#8C7853]">58 Inches</td>
                    <td className="p-3">5'7" – 5'8" (168 – 172 cm)</td>
                  </tr>
                  <tr className="hover:bg-[#F5F2EA]">
                    <td className="p-3 font-semibold text-[#8C7853]">60 Inches</td>
                    <td className="p-3">5'9"+ (173 cm & above)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#E0DCD3] rounded-xs text-xs text-[#555555] flex items-start gap-2">
              <Check className="w-4 h-4 text-[#8C7853] shrink-0 mt-0.5" />
              <span>
                <strong>Free Size Silhouette:</strong> Free Size accommodates bust measurements up to 48" comfortably with generous modest flare. Choose your abaya length based on your barefoot height.
              </span>
            </div>
          </div>
        )}

        <div className="bg-[#E8E5DD] p-4 rounded-xs text-xs text-[#000000] leading-relaxed mt-6">
          <strong className="block font-semibold mb-0.5">Bespoke Fit:</strong> Have distinct body proportions? Select <strong>Custom</strong> on any garment to provide your exact Chest, Hip, Abaya Length, Height, and Sleeve Length measurements.
        </div>
      </div>
    </div>
  );
};
