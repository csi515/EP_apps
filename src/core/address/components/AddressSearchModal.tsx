import { useState, type FC, type FormEvent } from 'react';
import { Check, Edit3, ExternalLink, Loader2, MapPin, Search } from 'lucide-react';
import { Modal } from '@/shared/components/ui';
import { searchAddress } from '../services/addressSearchService';
import type { AddressSearchResult } from '../types';

declare global {
  interface Window {
    daum?: {
      Postcode: new (config: {
        oncomplete: (data: {
          roadAddress: string;
          autoRoadAddress?: string;
          jibunAddress: string;
          zonecode: string;
          sido: string;
          sigungu: string;
          bname: string;
          buildingName: string;
        }) => void;
      }) => {
        open: () => void;
      };
    };
  }
}

function loadDaumPostcodeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.daum && window.daum.Postcode) {
      resolve();
      return;
    }
    const existing = document.getElementById('daum-postcode-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('우편번호 스크립트 로드 실패')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'daum-postcode-script';
    script.src = '//t.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('카카오 우편번호 서비스를 불러올 수 없습니다.'));
    document.head.appendChild(script);
  });
}

interface AddressSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: AddressSearchResult) => void;
}

export const AddressSearchModal: FC<AddressSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpeningKakao, setIsOpeningKakao] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed.length < 2) {
      setError('검색어는 최소 2자 이상 입력해 주세요.');
      return;
    }
    setIsSearching(true);
    setError(null);
    setSearched(true);
    try {
      const response = await searchAddress(trimmed);
      if (response.error && response.results.length === 0) {
        setResults([]);
        setError(response.error);
        return;
      }
      setResults(response.results);
      if (response.results.length === 0) {
        setError('검색 결과가 없습니다. 도로명이나 건물명으로 검색하거나, 아래 직접 사용하기 버튼을 눌러주세요.');
      }
    } catch (err) {
      setResults([]);
      setError(
        err instanceof Error
          ? err.message
          : '주소 검색 중 오류가 발생했습니다. 카카오 주소 검색이나 직접 입력을 이용해 주세요.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenKakaoPostcode = async () => {
    setIsOpeningKakao(true);
    setError(null);
    try {
      await loadDaumPostcodeScript();
      if (!window.daum || !window.daum.Postcode) {
        throw new Error('카카오 우편번호 서비스를 실행할 수 없습니다.');
      }
      new window.daum.Postcode({
        oncomplete: (data) => {
          const roadAddr = data.roadAddress || data.autoRoadAddress || data.jibunAddress;
          handleSelect({
            roadAddress: roadAddr,
            fullAddress: roadAddr,
            jibun: data.jibunAddress || null,
            postal: data.zonecode || null,
            sido: data.sido || null,
            sigungu: data.sigungu || null,
            dong: data.bname || null,
            buildingName: data.buildingName || null,
          });
        },
      }).open();
    } catch (err) {
      setError(err instanceof Error ? err.message : '카카오 주소 검색을 불러오지 못했습니다.');
    } finally {
      setIsOpeningKakao(false);
    }
  };

  const handleSelect = (result: AddressSearchResult) => {
    onSelect(result);
    setKeyword('');
    setResults([]);
    setError(null);
    setSearched(false);
    onClose();
  };

  const handleUseCurrentKeyword = () => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    handleSelect({
      roadAddress: trimmed,
      fullAddress: trimmed,
      jibun: null,
      postal: null,
      sido: null,
      sigungu: null,
      dong: null,
      buildingName: null,
    });
  };

  const handleClose = () => {
    setKeyword('');
    setResults([]);
    setError(null);
    setSearched(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="사업장 주소 검색" maxWidth="lg">
      <div className="p-4 sm:p-6 space-y-4">
        {/* 카카오 공식 우편번호 빠른 실행 배너 */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <span>카카오 우편번호 서비스로 찾기</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-extrabold">
                가장 정확함
              </span>
            </p>
            <p className="text-[11px] text-amber-800/90 mt-0.5 truncate">
              전국 모든 도로명·건물명·지번을 팝업에서 바로 선택할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenKakaoPostcode}
            disabled={isOpeningKakao}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FEE500] hover:bg-[#FDD835] active:bg-[#FBC02D] text-[#191919] text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 min-h-[40px] disabled:opacity-50"
          >
            {isOpeningKakao ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            <span>카카오 주소창 열기</span>
          </button>
        </div>

        {/* 직접 키워드 검색 */}
        <div className="flex gap-2">
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!isSearching && keyword.trim().length >= 2) {
                  void handleSearch();
                }
              }
            }}
            placeholder="도로명 또는 건물명 검색 (예: 테헤란로 123)"
            data-testid="input-address-search-keyword"
            className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none min-h-[44px]"
            autoFocus
            aria-label="주소 검색어"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            data-testid="btn-address-search-submit"
            disabled={isSearching || keyword.trim().length < 2}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl min-h-[44px] min-w-[44px] disabled:opacity-50 shadow-xs"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Search className="w-4 h-4" aria-hidden />
            )}
            <span className="hidden sm:inline">검색</span>
          </button>
        </div>

        {/* 현재 입력한 검색어 바로 사용하기 옵션 (언제든 막힘없이 채택 가능) */}
        {keyword.trim().length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-600 truncate mr-2">
              입력 내용: <strong className="text-slate-900">"{keyword.trim()}"</strong>
            </span>
            <button
              type="button"
              onClick={handleUseCurrentKeyword}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold shrink-0 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>이 주소 바로 적용</span>
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700 leading-relaxed">
            {error}
          </div>
        )}

        {/* 검색 결과 목록 */}
        <ul className="space-y-2 max-h-[45vh] overflow-y-auto" role="listbox" aria-label="주소 검색 결과">
          {results.map((item, idx) => (
            <li key={`${item.postal}-${item.roadAddress}-${idx}`}>
              <button
                type="button"
                data-testid="item-address-search-result"
                onClick={() => handleSelect(item)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors min-h-[44px]"
                role="option"
              >
                <p className="text-sm font-bold text-slate-900 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" aria-hidden />
                  <span>{item.roadAddress}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 pl-6">
                  {[item.postal && `우편번호 ${item.postal}`, item.jibun].filter(Boolean).join(' · ')}
                </p>
              </button>
            </li>
          ))}
        </ul>

        {!isSearching && searched && results.length === 0 && !error && (
          <div className="text-center py-5 space-y-2">
            <p className="text-xs text-slate-500">일치하는 도로명 주소 결과가 없습니다.</p>
            {keyword.trim() && (
              <button
                type="button"
                onClick={handleUseCurrentKeyword}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>입력한 "{keyword.trim()}" 그대로 등록하기</span>
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
