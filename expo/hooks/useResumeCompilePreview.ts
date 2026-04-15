import React from "react";

import { compilePreview } from "@/lib/api/resumeLab";
import type { ResumeData } from "@/lib/types";

type Options = {
  resumeData: ResumeData | null;
  selectedTemplate: string | null;
  debounceMs?: number;
};

export function useResumeCompilePreview({ resumeData, selectedTemplate, debounceMs = 1500 }: Options) {
  const [previewImageUri, setPreviewImageUri] = React.useState<string | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [compiling, setCompiling] = React.useState(false);
  const [compileError, setCompileError] = React.useState<string | null>(null);
  const [lastCompileTime, setLastCompileTime] = React.useState<number | null>(null);

  const seqRef = React.useRef(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const executeCompile = React.useCallback(
    async (page = 0) => {
      if (!resumeData || !selectedTemplate || selectedTemplate === "uploaded") return;

      const seq = ++seqRef.current;
      setCompiling(true);
      setCompileError(null);

      try {
        const result = await compilePreview(selectedTemplate, resumeData, page);
        if (seq !== seqRef.current) return;
        setPreviewImageUri(result.imageUri);
        setPageCount(result.pageCount);
        setCurrentPage(page);
        setLastCompileTime(Date.now());
      } catch (error) {
        if (seq !== seqRef.current) return;
        setCompileError(error instanceof Error ? error.message : "Compilation failed.");
      } finally {
        if (seq === seqRef.current) {
          setCompiling(false);
        }
      }
    },
    [resumeData, selectedTemplate]
  );

  const triggerCompile = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void executeCompile(currentPage);
  }, [currentPage, executeCompile]);

  const goToPage = React.useCallback(
    (page: number) => {
      if (page < 0) return;
      void executeCompile(page);
    },
    [executeCompile]
  );

  React.useEffect(() => {
    if (!resumeData || !selectedTemplate || selectedTemplate === "uploaded") {
      setPreviewImageUri(null);
      setPageCount(0);
      setCurrentPage(0);
      setCompileError(null);
      setLastCompileTime(null);
      return;
    }

    setCurrentPage(0);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void executeCompile(0);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [resumeData, selectedTemplate, debounceMs, executeCompile]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    previewImageUri,
    pageCount,
    currentPage,
    compiling,
    compileError,
    isRecompiling: compiling && previewImageUri !== null,
    triggerCompile,
    goToPage,
    lastCompileTime,
  };
}
